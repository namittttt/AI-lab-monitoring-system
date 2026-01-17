import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, minlength: 6 },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model("User", userSchema);


// import mongoose from "mongoose";
// import bcrypt from "bcryptjs";

// const userSchema = new mongoose.Schema(
//     {
//         fullName:{
//             type:String,
//             required:true
//         },
//         email:{
//             type:String,
//             required:true,
//             unique:true,
//         },
//         password:{
//             type:String,
//             required:true,
//             minlength:6,
//         },
//     },
//     {timestamps:true}
// );

// userSchema.methods.matchPassword = async function (enteredPassword) {
//     const isPasswordCorrect = await bcrypt.compare(enteredPassword,this.password);
//     return isPasswordCorrect
// } 

// // pre hook to encrypt password
// userSchema.pre("save",async function(next) {
//     if (!this.isModified("password")) return next();

//     try{
//         const salt = await bcrypt.genSalt(10);
//         this.password = await bcrypt.hash(this.password,salt);

//         next();
//     }catch(error){
//         next(error);
//     }
// })
// const User = mongoose.model("User",userSchema);

// export default User;