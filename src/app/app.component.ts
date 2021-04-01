import {
  Component,
  OnInit,
  ViewChild,
  NgZone,
  ChangeDetectorRef,
  ChangeDetectionStrategy
} from "@angular/core";
import { UserTableDataSource } from "./user-table-data-source";
import { CdkVirtualScrollViewport } from "@angular/cdk/scrolling";
import { MatSort } from "@angular/material/sort";
import { User } from "./user.model";
import { Observable, BehaviorSubject, defer, combineLatest } from "rxjs";
import { map, tap, distinctUntilChanged } from "rxjs/operators";
import { DataSource } from "@angular/cdk/collections";
import { animate, state, style, transition, trigger } from '@angular/animations';

import { MatTable } from '@angular/material/table';
import { CdkTable } from '@angular/cdk/table';

@Component({
  selector: "my-app",
  // templateUrl: "./cdk-table/cdk-table.html",
  templateUrl: "./mat-table/mat-table.html",
  // templateUrl: "./table-cdk-table/table-cdk-table.html",
  // templateUrl: "./table-mat-table/table-mat-table.html",
  styleUrls: ["./app.component.css"],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0', visibility: 'hidden' })),
      state('expanded', style({ height: '*', visibility: 'visible' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
  //changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  visibleColumns = ["id", "name", "email"];
  dataSource: UserTableDataSource;
  ITEM_SIZE = 48;

  @ViewChild(CdkVirtualScrollViewport, { static: true })
  viewPort: CdkVirtualScrollViewport;
  @ViewChild(MatSort, { static: true }) matSort: MatSort;
  //@ViewChild(MatTable, { static: true }) table: MatTable<any>;

  offset: number;

  //Details
  isExpansionDetailRow = (i: number, row: Object) => row.hasOwnProperty('detailRow');
  expandedElement: any;
  expandedElements: any[] = [];
  state: any = {}

  isExpanded(element) {
    return this.expandedElements.indexOf(element) !== -1;
  }

  // expand(element) {
  //   if (!this.isExpanded(element)) {
  //     this.expandedElements.push(element);
  //   }
  // }

  // collapse(element) {
  //   const index = this.expandedElements.indexOf(element);
  //   if (index !== -1) {
  //     delete this.expandedElements[index];
  //   }
  // }

  toggle(row) {
    this.expandedElement = this.expandedElement == row ? null : row;

    const index = this.expandedElements.indexOf(row);
    index === -1 ? this.expandedElements.push(row) : delete this.expandedElements[index];
    //this.state.expandedElement = this.state.expandedElement == row ? null : row;
    //console.log('toggle', row, this.expandedElement)
    //this.viewPort.detectChanges()
    //this.table.detectChanges()
    this.changeDetectorRef.detectChanges()
  }

  constructor(
    private ngZone: NgZone,
    private changeDetectorRef: ChangeDetectorRef
  ) {
    this.dataSource = new UserTableDataSource(this.ngZone);
  }

  ngOnInit() {
    this._initSorting();
    this.dataSource.attach(this.viewPort);

    this.viewPort.scrolledIndexChange
      .pipe(
        map(() => this.viewPort.getOffsetToRenderedContentStart() * -1),
        distinctUntilChanged(),
      )
      .subscribe(offset => (this.offset = offset));

    this.viewPort.renderedRangeStream.subscribe(range => {
      this.offset = range.start * -this.ITEM_SIZE;
    });
  }

  private _initSorting() {
    this.dataSource.matTableDataSource.sort = this.matSort;

    const originalSortingDataAccessor = this.dataSource.matTableDataSource
      .sortingDataAccessor;

    this.dataSource.matTableDataSource.sortingDataAccessor = (
      user: User,
      sortHeaderId: string
    ) => {
      if (sortHeaderId === "name") {
        return `${user.lastName}, ${user.firstName}`;
      }
      return originalSortingDataAccessor(user, sortHeaderId);
    };
  }

  onTableScroll(event) {
    console.log(event)
  }

  scrollToPage() {
    const index = 300
    this.viewPort.scrollToIndex(index);
  }
}

