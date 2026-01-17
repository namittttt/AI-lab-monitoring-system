import React, { createContext, useContext, useState, useEffect } from "react";
import axiosClient from "../lib/axiosClient";
import toast from "react-hot-toast";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const res = await axiosClient.get("/auth/me");
      setUser(res.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signup = async (data) => {
    await axiosClient.post("/auth/signup", data);
    toast.success("Signup successful!");
    await fetchMe();
  };

  const login = async (data) => {
    await axiosClient.post("/auth/login", data);
    toast.success("Login successful!");
    await fetchMe();
  };

  const logout = async () => {
    await axiosClient.post("/auth/logout");
    toast.success("Logged out");
    setUser(null);
  };

  useEffect(() => {
    fetchMe();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, signup, login, logout, fetchMe }} // ✅ added fetchMe
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);



// import React, { createContext, useContext, useState, useEffect } from "react";
// import toast from "react-hot-toast";
// import axiosClient from "../lib/axiosClient.js";
// import { connectSocket, disconnectSocket } from "../lib/socket.js";

// const AuthContext = createContext();

// export const AuthProvider = ({ children }) => {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true); // Start loading until fetchMe completes

//   // ------------------ SIGNUP ------------------
//   const signup = async (data) => {
//     setLoading(true);
//     try {
//       const res = await axiosClient.post("/auth/signup", data);
//       if (res.data.token) {
//         localStorage.setItem("token", res.data.token);
//       }
//       setUser(res.data.user);
//       connectSocket();
//       toast.success("Signup successful");
//     } catch (err) {
//       console.error(err);
//       const message =
//         err?.response?.data?.message ||
//         err?.response?.data?.error ||
//         "Signup failed";
//       toast.error(String(message));
//       throw err;
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ------------------ LOGIN ------------------
//   const login = async (data) => {
//     setLoading(true);
//     try {
//       const res = await axiosClient.post("/auth/login", data);
//       if (res.data.token) {
//         localStorage.setItem("token", res.data.token);
//       }
//       setUser(res.data.user);
//       connectSocket();
//       toast.success("Login successful");
//     } catch (err) {
//       console.error(err);
//       const message =
//         err?.response?.data?.message ||
//         err?.response?.data?.error ||
//         "Login failed";
//       toast.error(String(message));
//       throw err;
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ------------------ LOGOUT ------------------
//   const logout = async () => {
//     try {
//       await axiosClient.post("/auth/logout");
//     } catch (err) {
//       console.error(err);
//     } finally {
//       localStorage.removeItem("token");
//       disconnectSocket();
//       setUser(null);
//       toast.success("Logged out");
//     }
//   };

//   // ------------------ FETCH CURRENT USER ------------------
//   const fetchMe = async () => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       setUser(null);
//       setLoading(false);
//       return;
//     }

//     setLoading(true);
//     try {
//       const res = await axiosClient.get("/auth/me");
//       if (res.data.user) setUser(res.data.user);
//       else setUser(res.data);
//     } catch (err) {
//       console.error("fetchMe error:", err);
//       setUser(null);
//       localStorage.removeItem("token");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchMe();
//     return () => disconnectSocket();
//   }, []);

//   return (
//     <AuthContext.Provider
//       value={{ user, loading, signup, login, logout, fetchMe, setUser }}
//     >
//       {children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => useContext(AuthContext);
