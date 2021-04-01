import { ListRange } from '@angular/cdk/collections';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { DataSource } from '@angular/cdk/table';
import { Injectable, NgZone } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { combineLatest, from, Observable, of, Subscription, BehaviorSubject } from 'rxjs';
import {
  delay,
  exhaustMap,
  filter,
  map,
  shareReplay,
  startWith,
  switchMap,
  tap
} from 'rxjs/operators';
import { User } from './user.model';
import { name, internet } from 'faker';
import faker from 'faker';
@Injectable()
export class UserTableDataSource extends DataSource<User> {
  private _pageSize = 100; // elements
  private _pages = 10; // pages
  private _pageOffset = 100; // elements
  private _pageCache = new Set<number>();
  private _subscription: Subscription;
  private _viewPort: CdkVirtualScrollViewport;

  // Create MatTableDataSource so we can have all sort,filter bells and whistles
  matTableDataSource: MatTableDataSource<User> = new MatTableDataSource();

  // Expose dataStream to simulate VirtualForOf.dataStream
  dataStream = this.matTableDataSource.connect().asObservable();

  renderedStream = new BehaviorSubject<User[]>([]);
  constructor(private ngZone: NgZone) {
    super();
    faker.seed(1234);
  }

  attach(viewPort: CdkVirtualScrollViewport) {
    if (!viewPort) {
      throw new Error('ViewPort is undefined');
    }
    this._viewPort = viewPort;

    this.initFetchingOnScrollUpdates();

    // Attach DataSource as CdkVirtualForOf so ViewPort can access dataStream
    this._viewPort.attach(this as any);

    // Trigger range change so that 1st page can be loaded
    this._viewPort.setRenderedRange({ start: 0, end: 10 });
  }

  // Called by CDK Table
  connect(): Observable<User[]> {
    const tableData = this.matTableDataSource.connect();
    const filtered =
      this._viewPort === undefined
        ? tableData
        : this.filterByRangeStream(tableData);

    filtered.subscribe(data => {
      this.renderedStream.next(data);
    });

    return this.renderedStream.asObservable();
  }

  disconnect(): void {
    if (this._subscription) {
      this._subscription.unsubscribe();
    }
  }

  private initFetchingOnScrollUpdates() {
    this._subscription = this._viewPort.renderedRangeStream
      .pipe(
        switchMap(range => this._getPagesToDownload(range)),
        filter(page => !this._pageCache.has(page)),
        exhaustMap(page => this._simulateFetchAndUpdate(page))
      )
      .subscribe();
  }

  private _getPagesToDownload({ start, end }: { start: number; end: number }) {
    const startPage = this._getPageForIndex(start);
    const endPage = this._getPageForIndex(end + this._pageOffset);
    const pages: number[] = [];
    for (let i = startPage; i <= endPage && i < this._pages; i++) {
      if (!this._pageCache.has(i)) {
        pages.push(i);
      }
    }
    return from(pages);
  }

  private _getPageForIndex(index: number): number {
    return Math.floor(index / this._pageSize);
  }

  private filterByRangeStream(tableData: Observable<User[]>) {
    const rangeStream = this._viewPort.renderedRangeStream.pipe(
      startWith({} as ListRange)
    );
    const filtered = combineLatest(tableData, rangeStream).pipe(
      map(([data, { start, end }]) => {
        return start === null || end === null ? data : data.slice(start, end)
      })
    );
    return filtered;
  }

  private _simulateFetchAndUpdate(page: number): Observable<User[]> {
    return of(page).pipe(
      filter(page => !this._pageCache.has(page)),
      map(page =>
        Array.from(Array(this._pageSize).keys()).map((v, i) => {
          const id = page * this._pageSize + i;
          const firstName = name.firstName();
          const lastName = name.lastName();
          const email = internet.email(firstName, lastName);
          return { id, firstName, lastName, email } as User;
        })
      ),
      delay(1000),
      tap(() => this._pageCache.add(page)),
      tap(users => {
        const newData = [...this.matTableDataSource.data];
        newData.splice(page * this._pageSize, this._pageSize, ...users);
        this.matTableDataSource.data = newData;
      })
    );
  }
}
