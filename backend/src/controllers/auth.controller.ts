import { pool } from "../config/DB_connect";
import { Request,Response } from "express";
import { hashPassword, matchPassword } from "../utils/hash";
import { generateToken } from "../utils/jwt";

interface signupBody{
    name:string,
    email:string,
    password:string
}
interface loginBody{
    email:string,
    password:string
}
interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  is_verified:boolean,
  created_at: Date;
}
export const signup = async (req:Request<{},{},signupBody>, res:Response) : Promise<Response| void> =>{
    try {

        const { name, email, password } = req.body;

        const existingUser = await pool.query<User>(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: "Email already exists please sign in" });
        }

        const hashed = await hashPassword(password);

        const result = await pool.query<User>(
            "INSERT INTO users (name,email,password_hash) VALUES ($1,$2,$3) RETURNING id,name,email,is_verified,created_at",
            [name, email, hashed]
        );

        res.status(201).json({
            message: "User signed up",
            user: result.rows[0]
        });
    } catch (error) {
        const err=error as Error;
        res.status(500).json({ message: err.message });
    }
}

export const login = async (req:Request<{},{},loginBody>, res:Response) : Promise<Response | void> => {
    try {
        const { email, password } = req.body;

        const result = await pool.query<User>(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ message: "User with this email does not exist" })
        };

        const user = result.rows[0];

        const valid = await matchPassword(password, user.password_hash);

        if (!valid) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = generateToken(user);
        
        res.cookie("loginToken",token,{
            httpOnly:true,
            secure: process.env.NODE_ENV === "production", 
            sameSite:"strict",
            maxAge:24*60*60*1000
        });
        res.status(200).json({
            message: "Login successful",
        });
    } catch (error) {
        const err = error as Error;
        res.status(500).json({ message: err.message });
    }
}