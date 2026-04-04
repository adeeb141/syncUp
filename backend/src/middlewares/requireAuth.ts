import jwt from "jsonwebtoken";
import { Request,Response,NextFunction } from "express";

interface JwtPayload{
  id:string,
  email:string,
  is_verified:boolean,
  created_at:Date
}
export const requireAuth=(req :Request,res:Response,next:NextFunction) : Response | void=>{
    try{
      const token=req.cookies?.loginToken;

      if(!token){
         return res.status(401).json({ message: "Unauthorized - No token" });
      }
      const result= jwt.verify(token,process.env.JWT_SECRET as string) as JwtPayload;

      req.user={
        id:result.id,
        email:result.email,
        is_verified:result.is_verified,
        created_at:result.created_at
      }
      next();
    }catch(error){
       return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }
}