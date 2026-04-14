const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

const fetchApi = async<T>(endpoint: string, options?: RequestInit): Promise<T> => {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    credentials: "include",
  });

  // ✅ Read body ONLY ONCE
  const contentType = res.headers.get("content-type");

  let data: any;

  if (contentType && contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text(); // HTML or empty response
  }

  // ❌ Handle error
  if (!res.ok) {
    const message =
      typeof data === "string"
        ? "Server returned HTML (check API route)"
        : data?.message || "Something went wrong";

    console.error("API ERROR:", data);
    throw new Error(message);
  }

  // ✅ Return JSON or empty object
  return data as T;
};
export const api={
    get:<T>(endpoint:string)=>fetchApi<T>(endpoint),
    post:<T>(endpoint:string,body:unknown)=>fetchApi<T>(endpoint,{method:"POST",body:JSON.stringify(body)}),
    put:<T>(endpoint:string,body:unknown)=>fetchApi<T>(endpoint,{method:"PUT",body:JSON.stringify(body)}),
    patch:<T>(endpoint:string,body:unknown)=>fetchApi<T>(endpoint,{method:"PATCH",body:JSON.stringify(body)}),
    delete:<T>(endpoint:string)=>fetchApi<T>(endpoint,{method:"DELETE"})
}