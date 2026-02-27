const express = require('express');

// express ek node framework hai to single-page multiple-page application me use hota hai aur ye routing me v use hota hai

// express ek function hai jo express ke properties ko access me use hota hai aur uske app variable me store rkte hai as reference
const app = express();

// app.use hota hai middleware ko pass krne ke liye jaise koi user login hai ki nhii koi properties access krta hai to 
app.use((req, res, next) => {
    console.log("Came in first", req.url, req.method);
    next();
})

app.use((req, res, next) => {
    console.log("Came in second", req.url, req.method);
    res.send("Hello Bhai");
})



app.listen(3000, ()=>{
    console.log(`Server is running at http://localhost:3000`);
})