// // src/lib/axiosClient.js
// import axios from "axios";

// const axiosClient = axios.create({
//   baseURL: "http://localhost:5001/api", // <-- change if your backend runs elsewhere
//   withCredentials: true,             // allows cookies if backend uses them
// });

// // Automatically attach token to every request
// axiosClient.interceptors.request.use((config) => {
//   const token = localStorage.getItem("token");
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

// export default axiosClient;

import axios from "axios";

const axiosClient = axios.create({
  baseURL: "http://localhost:5001/api",
  withCredentials: true, // ✅ MUST for cookies
});

export default axiosClient;

