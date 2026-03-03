import jwt from "jsonwebtoken";

export const requireAuth=(req,res,next)=>{
    try{
      const token=req.cookies.loginToken;

      if(!token){
         return res.status(401).json({ message: "Unauthorized - No token" });
      }
      const result= jwt.verify(token,process.env.JWT_SECRET);

      req.user={
        id:result.id,
        email:result.email
      }
      next();
    }catch(error){
       return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }
}