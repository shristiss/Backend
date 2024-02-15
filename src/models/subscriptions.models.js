import mongoose from "mongoose";

const subscriptionSchema= new mongoose.Schema(
    {
        subscriber: {
            type: mongoose.Schema.Types.ObjectId, //person who is subscribing
            ref: "User"
        },
        channel : {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },


    }
    ,{timesstamps:true})

export const Subscription = mongoose.model("Subscription",subscriptionSchema)