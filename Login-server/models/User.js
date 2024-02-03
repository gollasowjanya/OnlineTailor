const mongoose=require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({

    name:String,
    email:String,
    password:String,
    dateOfBirth:{
        type:Date,
        required:true,
    },
    address: String,
    phone:Number,
    
    role: {
        type: String,
        enum: ['tailor', 'customer'], // Ensures that role is one of these values
        required: true,
    },
    verified: Boolean,
    
    
});

const User = mongoose.model('User',UserSchema);
module.exports = User;