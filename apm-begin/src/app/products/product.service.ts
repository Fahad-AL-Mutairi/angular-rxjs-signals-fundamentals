import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { BehaviorSubject, catchError, combineLatest, filter, map, Observable, of, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { Product, Result } from './product';
import { ProductData } from './product-data';
import { HttpErrorService } from '../utilities/http-error.service';
import { ReviewService } from '../reviews/review.service';
import { Review } from '../reviews/review';
import {toSignal} from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  private productsUrl = 'api/products';

  private http = inject(HttpClient);
  private errorService = inject(HttpErrorService);
  private reviewService = inject(ReviewService);

  private  productSelectedSubject = new BehaviorSubject<number | undefined>(undefined);
  readonly productSelected$ = this.productSelectedSubject.asObservable();

 private productsResult$ = this.http.get<Product[]>(this.productsUrl)
  .pipe(
    map(p => (  {data: p} as Result<Product[]> )),
    tap(p => console.log(JSON.stringify(p))),
    shareReplay(1),
    catchError(err => of({
      data: [],
      error : this.errorService.formatError(err) 
      } as Result<Product[]>)) 
      );
      private  productsResult = toSignal(this.productsResult$ ,
       {initialValue : {data: []  } as Result<Product[]>  } );
       products = computed(() => this.productsResult().data);
       productsError = computed(() => this.productsResult().error)
   

      readonly product$ = this.productSelected$
      .pipe(
        filter(Boolean),
        switchMap(id =>{
          const productUrl = this.productsUrl + '/' + id ;
          return this.http.get<Product>(productUrl)
          .pipe(
            switchMap(product => this.getProductWithReviews(product)) ,
            catchError(err => this.handleError(err)) 
            );
        } )
      );


  getProduct(id : number){
    const productUrl = this.productsUrl + '/' + id ;
    return this.http.get<Product>(productUrl)
    .pipe(
      tap(() => console.log('in http.get by id pipline')),
      switchMap(product => this.getProductWithReviews(product)) ,
      catchError(err => this.handleError(err)) 
    );
  }

  // product$ = combineLatest([
  //   this.productSelected$ , 
  //   this.products$
  // ]).pipe(
  //   map(([selectedProductId , products]) => 
  //     products.find(product => product.id === selectedProductId) 
  // ),
  // filter(Boolean),
  // switchMap(product => this.getProductWithReviews(product)) ,
  // catchError(err => this.handleError(err)) 
  // );

  productSelected(selectProductId : number) : void {
    this.productSelectedSubject.next(selectProductId);
  }


  private getProductWithReviews(product : Product) : Observable<Product>{
    if(product.hasReviews){
      return this.http.get<Review[]>(this.reviewService.getReviewUrl(product.id))
      .pipe(
        map(reviews => ({...product , reviews} as Product))
      )
    }
    else{
      return of(product);
    }
  }

  private handleError(err : HttpErrorResponse): Observable<never> {
    const formattedMessage = this.errorService.formatError(err);
    return throwError(() => formattedMessage);
    
  }

}
