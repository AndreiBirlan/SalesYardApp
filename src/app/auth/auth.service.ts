import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { Subject } from "rxjs";

import { AuthData } from "./auth-data.model";

import { environment } from "../../environments/environment";

const BACKEND_URL = environment.apiURL + '/user/';


@Injectable({providedIn: "root"})   
export class AuthService {
    private isAuthenticated = false;
    private token: string;
    private tokenTimer: any;
    private userId: string;
    private userName: string;
    private authStatusListener = new Subject<boolean>();
    
    constructor(private http: HttpClient, private router: Router){}

    getToken(){
        return this.token;
    }

    getIsAuth() {
        return this.isAuthenticated;
    }

    getUserId() {
        return this.userId;
    }

    getUserName() {
        return this.userName;
    }

    getAuthStatusListener(){
        return this.authStatusListener.asObservable();
    }

    createUser(userName: string, email: string, password: string) {
        const authData: AuthData = {userName: userName, email: email, password: password};
        this.http.post<{userName: string}>(BACKEND_URL + "/signup", authData)
        .subscribe(() => {
            this.router.navigate(['/']);
        }, error => {
            this.authStatusListener.next(false)
        });
    }

    login(userName: string, email: string, password: string) {
        const authData: AuthData = {userName: userName, email: email, password: password};
        this.http.post<{ user: string, token: string, expiresIn: number, userId: string }>(BACKEND_URL + "/login", authData)
        .subscribe(response => {
            this.userName = response.user;
            console.log(this.userName);
            const token = response.token;
            this.token = token;
            if(token) {
                const expiresInDuration = response.expiresIn;
                this.setAuthTimer(expiresInDuration);
                this.userId = response.userId;
                this.isAuthenticated = true;
                this.authStatusListener.next(true);
                const now = new Date();
                const expirationDate = new Date(now.getTime() + expiresInDuration * 1000);
                console.log(expirationDate);
                this.saveAuthData(this.userName, token, expirationDate, this.userId);
                this.router.navigate(['/']);
            }
        }, error => {
            this.authStatusListener.next(false);
        });
    }

    autoAuthUser() {
        const authInformation = this.getAuthData();
        if (!authInformation) {
            return;
        }
        const now = new Date();
        const expiresIn = authInformation.expirationDate.getTime() - now.getTime();
        if (expiresIn > 0) {
            this.token = authInformation.token;
            this.isAuthenticated = true;
            this.userId = authInformation.userId;
            this.userName = authInformation.userName;
            this.setAuthTimer(expiresIn / 1000);
            this.authStatusListener.next(true);
        }
    }

    logout() {
        this.token = null;
        this.isAuthenticated = false;
        this.authStatusListener.next(false);
        this.router.navigate(['/']);
        this.userId = null;
        this.userName = null;
        this.clearAuthData();
        clearTimeout(this.tokenTimer);
    }

    private setAuthTimer(duration: number) {
        console.log("setting timer: " + duration);
        this.tokenTimer = setTimeout(() =>{
            this.logout();
        }, duration * 1000);
    }

    private saveAuthData(userName: string, token: string, expirationDate: Date, userId: string) {
        localStorage.setItem('token', token);
        localStorage.setItem('expiration', expirationDate.toISOString());
        localStorage.setItem('userId', userId);
        localStorage.setItem('userName', userName);
    }

    private clearAuthData() {
        localStorage.removeItem('token');
        localStorage.removeItem('expiration');
        localStorage.removeItem('userId');
        localStorage.removeItem('userName')
    }

    private getAuthData(){
        const token = localStorage.getItem('token');
        const expirationDate = localStorage.getItem('expiration');
        const userId = localStorage.getItem('userId');
        const userName = localStorage.getItem('userName');
        if (!token || !expirationDate) {
            return;
        }
        return {
            token: token,
            expirationDate: new Date(expirationDate),
            userId: userId,
            userName: userName
        }
    }
}