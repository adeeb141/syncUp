import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
interface User{
    id:string,
    email:string,
    is_verified:boolean,
    created_at:Date
}
if(!process.env.JWT_SECRET){
    throw new Error("JWT_SECRET is not defined");
}
const JWT_SECRET=process.env.JWT_SECRET;
export const generateToken= (user:User) : string=>{
    return jwt.sign(
        {id:user.id,email:user.email,is_verified:user.is_verified,created_at:user.created_at},
        JWT_SECRET,
        {expiresIn:"1d"}
    );
}