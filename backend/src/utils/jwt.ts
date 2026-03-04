import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();
interface User{
    id:string,
    email:string
}
if(!process.env.JWT_SECRET){
    throw new Error("JWT_SECRET is not defined");
}
const JWT_SECRET=process.env.JWT_SECRET;
export const generateToken= (user:User) : string=>{
    return jwt.sign(
        {id:user.id,email:user.email},
        JWT_SECRET,
        {expiresIn:"1d"}
    );
}