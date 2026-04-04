import { Request } from "express";

interface RequestUser{
    id:string,
    email:string,
    is_verified:boolean,
    created_at:Date
}

declare global{
    namespace Express{
       interface Request{
        user?:RequestUser;
       }
    }
}