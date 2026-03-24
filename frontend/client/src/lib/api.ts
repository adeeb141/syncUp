const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
console.log(BASE_URL);

const fetchApi = async<T>(endpoint:string,options?:RequestInit):Promise<T>=>{
   
    const res= await fetch(`${BASE_URL}${endpoint}`,{
        ...options,
        headers:{
           "Content-Type":"application/json",
           ...options?.headers
        },
        credentials:"include"
    })
    if(!res.ok){
        const error=await res.json();
        throw new Error(error.message)
    }
    return res.json();
}

export const api={
    get:<T>(endpoint:string)=>fetchApi<T>(endpoint),
    post:<T>(endpoint:string,body:unknown)=>fetchApi<T>(endpoint,{method:"POST",body:JSON.stringify(body)}),
    put:<T>(endpoint:string,body:unknown)=>fetchApi<T>(endpoint,{method:"PUT",body:JSON.stringify(body)}),
    delete:<T>(endpoint:string)=>fetchApi<T>(endpoint,{method:"DELETE"})
}