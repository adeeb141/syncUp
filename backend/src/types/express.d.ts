import { Request } from "express";

interface RequestUser{
    id:string,
    email:string
}

declare global{
    namespace Express{
       interface Request{
        user?:RequestUser;
       }
    }
}