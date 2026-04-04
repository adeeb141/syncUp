"use client"
import { useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";
import { User } from "@/types";

export const AuthProvider = () => {
    const { setAuth, setLoading } = useAuthStore();
    const hasFetched = useRef(false);

    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        const fetch = async () => {
            console.log("AuthProvider Ran!!!");
            try {
                const user = await api.get("/api/auth/me") as User;
                if (user) {
                    setAuth(user);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetch();
    }, []);
    return null;
}
