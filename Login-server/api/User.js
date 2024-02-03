const express= require('express');
const router= express.Router();
const moment = require('moment');
const User=require('./../models/User');
const UserVerification=require('./../models/UserVerification');
const nodemailer=require('nodemailer');
const {v4: uuidv4}=require('uuid');
require("dotenv").config();
const bcrypt=require('bcrypt');

const path=require("path");

let transporter=nodemailer.createTransport({
    service:"gmail",
    auth:{
        user:process.env.AUTH_EMAIL,
        pass:process.env.AUTH_PASS,
    }
})

//Testing success
transporter.verify((error,success)=>{
    if(error){
        console.log(error);
    }
    else{
        console.log("Ready for messages");
        console.log(success)
    }
})

//signup
router.post('/signup',(req,res) => {
        let{ name, email, password, dateOfBirth ,address,role,phone}=req.body;
        
        name=name.trim();
        email=email.trim();
        password=password.trim();
        address=address.trim();
         phone=phone.trim()
        if(name == ""||email==""||password==""||dateOfBirth==""){
            res.json({
                status: "FAILED",
                message: "Empty input fields"
            });
        }
        

        else if(!/^[a-zA-Z]*$/.test(name)){
            res.json({
                status: "FAILED",
                message: "Invalid name entered"
            })
        }
        else if(!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)){
            res.json({
                status: "FAILED",
                message:"Invalid email entered"
            })
        }
        
        else if(!moment(dateOfBirth, 'YYYY-MM-DD', true).isValid())
        {
            res.json({
                status:"FAILED",
                message:"Invalid date of birth format. Use the format YYYY-MM-DD.",
            })
        }
        else if(password.length <8){
            res.json({
                status:"FAILED",
                message:"Password is too short!."
            })
        }
        else{
                User.find({email}).then(result =>{
                    console.log('Existing users with the same email:', result);
                        if(result.length)
                        {
                            res.json({
                                status:"FAILED",
                                message:"User with the provided email already exist"
                            })
                        }
                        else
                        {
                            const saltRounds = 10;
                            bcrypt.hash(password,saltRounds).then(hashedPassword =>{
                                console.log('Plain Text Password:', password);
                              console.log('Hashed Password:', hashedPassword);

                             const newUser=new User({
                                name,
                                email,
                                password:hashedPassword,
                                dateOfBirth,
                                address,
                                phone,
                                role,
                                verified:false,
                             });

                             newUser.save().then(result=>{
                                console.log('User saved successfully:', result);
                                sendVerificationEmail(result,res);
                             })
                             .catch(err=>{
                                console.error('Error saving user:', err);
                                res.json({
                                    status:"FAILED",
                                    message:"An error occured while saving user account!"
                                });

                             });

                            })

                            .catch(err=>{
                                console.error('Error saving user:', err);
                                res.json({
                                    status:"FAILED",
                                    message:"An error occured while hashing the password"
                                })
                            })
                        }


                }).catch(err=>{
                    console.log(err);
                    res.json({
                        status:"FAILED",
                        message:"An error occured while checking for existing user!"
                    })
                })      
        }



})

//send verification email
const sendVerificationEmail=({_id,email},res)=>{
    const currentUrl="http://localhost:7000/";
    const uniqueString=uuidv4() + _id;

    //mail options
    const mailOptions={
        from:process.env.AUTH_EMAIL,
        to:email,
        subject:"Verify Your Email",
        html:`<p>Verify your email address to complete the signup and login into your account.</p><p>This link <b>expires in 6hours</b>.</p><p>Press <a href=${currentUrl + "user/verify/" + _id + "/" + uniqueString}> here </a> to proceed.</p>`,
    };

    //hash the uniquestring
    const saltRounds=10;
    bcrypt.hash(uniqueString, saltRounds)
    .then((hashedUniqueString)=>{
        const newVerification=new UserVerification({
            userId:_id,
            uniqueString:hashedUniqueString,
            createdAt:Date.now(),
            expiresAt:Date.now() + 21600000,
        });

        newVerification
        .save()
        .then(()=>{
            transporter
            .sendMail(mailOptions)
            .then(()=>{
                //email sent and verification record saved
                res.json({
                    status:"PENDING",
                    message:"Verification email sent"
                })
            })
            .catch((error)=>{
                console.log(error);
                res.json({
                    status:"FAILED",
                    message:"Verification email failed"
                })
            })
        })
        .catch((error)=>{
            console.log(error);
            res.json({
                status:"FAILED",
                message:"Couldn't save verification email data"
            })
        })
    })
    .catch(()=>{
        res.json({
            status:"FAILED",
            message:"An error occured while hashing email data!"
        })
    })
}

//verify email 
router.get("/verify/:userId/:uniqueString",(req,res)=>{
    let {userId,uniqueString}=req.params;

    UserVerification
    .find({userId})
    .then((result)=>{
        if(result.length>0){
            //user verification record exists so we can proceed
          const {expiresAt}=result[0];
          const hashedUniqueString=result[0].uniqueString;

          if(expiresAt < Date.now()){
            //record has expired so we delete it
            UserVerification.deleteOne({userId})
            .then(result=>{
                User.deleteOne({_id:userId})
                .then(()=>{
                    let message="Link has expired.Please sign up again.";
                    res.redirect(`/user/verified/error=true&message=${message}`);
                })
                .catch(error=>{
                    console.log(error)
                    let message="Clearing user with expired unique string failed.";
                    res.redirect(`/user/verified/error=true&message=${message}`);
                })
            })
            .catch((error)=>{
                console.log(error)
                let message="An error occured while clearing expired user verification record.";
                res.redirect(`/user/verified/error=true&message=${message}`);
            })

          }
          else{
           //valid record exists so validate the user string
           bcrypt.compare(uniqueString,hashedUniqueString)
           .then(result=>{
            if(result){
                //strings match
                User.updateOne({_id:userId},{verified:true})
                .then(()=>{
                    UserVerification
                    .deleteOne({userId})
                    .then(()=>{
                      res.json({
                       status : 'SUCCESS'
                      })
                      
                    })
                })
                .catch(error=>{
                    console.log(error);
                    let message="An error occured while updating new record to show verified";
                res.redirect(`/user/verified/error=true&message=${message}`);
                })
            }
            else{
                //existing record but incorrect details passed
                let message="Invalid verification details passed.check your inbox.";
                res.redirect(`/user/verified/error=true&message=${message}`);
            }
           })
           .catch(error=>{
            console.log(error)
            let message="An error occured while comparing unique strings";
                res.redirect(`/user/verified/error=true&message=${message}`);
           })
          }
        }
        else{
            let message="Account record doesn't exist or has been verified already.Please sign up or login.";
   res.redirect(`/user/verified/error=true&message=${message}`);
        }
    })
    .catch((error)=>{
        console.log(error)
        let message="An error occured while checking for existing user";
   res.redirect(`/user/verified/error=true&message=${message}`);
    })
});

//signin
router.post('/signin', async (req, res) => 
{
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.json({
                status: 'FAILED',
                message: 'Email and password are required fields.',
            });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.json({
                status: 'FAILED',
                message: 'User not found. Please check your email or sign up.',
            });
        }

        if (!user.verified) {
            return res.json({
                status: 'FAILED',
                message: "Email hasn't been verified yet. Check your inbox.",
            });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);

        if (isPasswordMatch) {
            // Consider using JWT for creating and sending tokens
            // const token = generateToken(user._id);
            return res.json({
                status: 'SUCCESS',
                message: 'Signin successful!',
                data: {
                    userId: user._id,
                    name: user.name,
                    email: user.email,
                    dateOfBirth: user.dateOfBirth,
                    // token: token,
                },
            });
        } else {
            return res.json({
                status: 'FAILED',
                message: 'Incorrect password. Please try again.',
            });
        }
    } catch (error) {
        console.error('Error during signin:', error);
        return res.json({
            status: 'FAILED',
            message: 'An error occurred during signin.',
        });
    }
}
);


module.exports = router;