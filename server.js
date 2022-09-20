const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cookieParser = require("cookie-parser");
var nodemailer = require('nodemailer');

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'shindeshoponline@gmail.com',
        pass: 'spetnxskrjzhaaui'
    }
});


const app = express();

const oneDay = 1000 * 60 * 60 * 24;

//session
app.use(session({
    secret: 'ram-dhanu',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: oneDay }
}));

//database connection
const mongoose = require('mongoose');
const DB = 'mongodb+srv://sky:sky@cluster0.de1mtdi.mongodb.net/todo?retryWrites=true&w=majority';
mongoose.connect(DB).then(() => {
    console.log("connection successful");
}).catch((err) => {
    console.log(err);
});

var BookSchema = mongoose.Schema({
    url: String,
    name: String,
    price: Number
});

var Book = mongoose.model('Book', BookSchema, 'bookstore');

var ProfileSchema = mongoose.Schema({
    user: String,
    name: String,
    gmail: String,
    mobile: Number,
    address: String
});

var Profile = mongoose.model('Profile', ProfileSchema, 'profiles');

var ProductSchema = mongoose.Schema({
    user: String,
    data: Array
});

var Product = mongoose.model('Product', ProductSchema, 'products');


var UserSchema = mongoose.Schema({
    username: String,
    password: String
});

var User = mongoose.model('user', UserSchema, 'userdata');


var VegiSchema = mongoose.Schema({
    url: String,
    name: String,
    price: Number
});

var Vegi = mongoose.model('Vegi', BookSchema, 'vegitable');

var Electronics = mongoose.model('electronics', VegiSchema, 'electronics');


//middleWares
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(cookieParser());


app.get('/', (req, res) => {
    res.sendFile(path.resolve('./index.html'));
});
app.get('/clothes', async(req, res) => {
    if (!req.session.isAuth) {
        return res.redirect("/login");
    }
    const tem = await Book.find({});
    const data = tem.filter((e) => {
        if (e.price) {
            return e;
        }
    });

    res.render('./clothes.ejs', { data: data });
})

app.get('/vegitable', async(req, res) => {
    if (!req.session.isAuth) {
        return res.redirect("/login");
    }
    const tem = await Vegi.find({});
    const data = tem.filter((e) => {
        if (e.price) {
            return e;
        }
    });
    res.render('./vegi.ejs', { data: data });
});

app.post('/book/:id', async(req, res) => {
    if (!req.session.isAuth) {
        return res.redirect("/login");
    }
    const data = await Product.findOne({ 'user': req.session.userid });
    let id = req.params.id;
    let product = await Book.findOne({ '_id': id.slice(1) });
    if (product === null) {
        product = await Vegi.findOne({ '_id': id.slice(1) });
    }
    if (product === null) {
        product = await Electronics.findOne({ '_id': req.params.id.slice(1) });
    }
    if (product === null) {
        return res.end("product null");
    }
    if (data === null) {
        const newuser = new Product({ user: req.session.userid, data: [product] });
        await newuser.save();
        return res.redirect('/orders');
    }
    const dd = data.data;
    dd.push(product);
    const rrr = await Product.updateOne({ user: req.session.userid }, { $set: { data: dd } }, { upsert: true });
    await rrr.upserted;
    var mailOptions = {
        from: 'shindeshoponline@gmail.com',
        to: req.session.userid,
        subject: 'Order Confirmed',
        html: '<div><h1>Well-Come to Shinde-Shop</h1><p>Your Order Has been Confirmed</p><h3>Happy Shopping</h3><p>Visit our website <a href="https://xyzss.herokuapp.com/">xyzss.herokuapp.com</a></></div>'
    };
    transporter.sendMail(mailOptions);
    res.redirect('/orders');
});

app.get('/orders', async(req, res) => {
    if (!req.session.isAuth) {
        return res.redirect("/login");
    }
    const data = await Product.findOne({ 'user': req.session.userid });
    const dd = await data.data;
    res.render('./orders.ejs', { data: dd });
});

app.get('/register', (req, res) => {
    return res.render('./regi.ejs', {
        name: null,
    })
});

app.post('/register', async(req, res) => {
    if (req.body.password !== req.body.repassword) {
        return res.render('./regi.ejs', {
            name: "password does not match",
        })
    }
    const pass = await bcrypt.hash(req.body.password, 10);
    const book1 = new User({ username: req.body.username, password: pass });
    book1.save();

    var mailOptions = {
        from: 'shindeshoponline@gmail.com',
        to: req.body.username,
        subject: 'Acount has been created on Shinde-Shop',
        html: '<div><h1>Well-Come to Shinde-Shop</h1><p>Successfully your acount has been created on Shinde-Shop</p><h3>Happy Shopping</h3><p>Visit our website <a href="https://xyzss.herokuapp.com/">xyzss.herokuapp.com</a></></div>'
    };
    transporter.sendMail(mailOptions);

    res.redirect('/login');
});

app.get('/login', (req, res) => {
    return res.render('./login.ejs', {
        name: null,
    });
});

app.post('/login', async(req, res) => {
    let { username, password } = req.body;
    const user = await User.find({ username: username });
    if (user.length === 0) {
        return res.render('./login.ejs', {
            name: "This username and password does not exist",
        });
    }
    const isMatch = await bcrypt.compare(password, user[0].password);
    if (!isMatch) {
        return res.render('./login.ejs', {
            name: "This username and password does not exist",
        });
    }
    if (username !== user[0].username) {
        return res.render('./login.ejs', {
            name: "This username and password does not exist",
        });
    }
    req.session.isAuth = true;
    req.session.userid = username;
    res.redirect('/');
});

app.get('/profile', async(req, res) => {
    if (!req.session.isAuth) {
        return res.redirect('/createProfile');
    }

    let user = await Profile.findOne({ user: req.session.userid });

    if (user !== null) {
        const data = await Product.findOne({ 'user': req.session.userid });
        const dd = await data.data;
        let total = 0;
        dd.forEach((el) => {
            total = total + el.price;
        });
        return res.render('./profile.ejs', { user: user, data: dd, total: total });
    }
    let data = [];
    return res.render('./createProfile.ejs', { data: data });
});

app.get('/createProfile', (req, res) => {
    if (!req.session.isAuth) {
        return res.redirect("/login");
    }
    res.render('./createProfile.ejs', {});
})

app.post('/addprofile', async(req, res) => {
    if (!req.session.isAuth) {
        return res.redirect("/login");
    }
    const { fullname, gmail, mobile, address } = req.body;
    const pp = new Profile({ user: req.session.userid, name: fullname, gmail: gmail, mobile: mobile, address: address });
    pp.save();
    res.end("added");
});

app.get('/confirm/:id', async(req, res) => {
    if (!req.session.isAuth) {
        return res.redirect("/login");
    }
    let data = await Book.findOne({ '_id': req.params.id.slice(1) });
    if (data === null) {
        data = await Electronics.findOne({ '_id': req.params.id.slice(1) });
    }
    res.render('./confirm.ejs', { data: data });
});
app.get('/confirmvegi/:id', async(req, res) => {
    if (!req.session.isAuth) {
        return res.redirect("/login");
    }
    const data = await Vegi.findOne({ '_id': req.params.id.slice(1) });
    res.render('./confirm.ejs', { data: data });
});

app.post('/orderCancel/:id', async(req, res) => {
    if (!req.session.isAuth) {
        return res.redirect("/login");
    }
    const data = await Product.findOne({ 'user': req.session.userid });
    let dd = await data.data;
    let f = false;
    dd = await dd.filter(el => {
        if (el.name !== req.params.id) {
            return el;
        }
        if (f) {
            return el;
        }
        f = true;
    });
    const rrr = await Product.updateOne({ user: req.session.userid }, { $set: { data: dd } }, { upsert: true });
    await rrr.upserted;
    var mailOptions = {
        from: 'shindeshoponline@gmail.com',
        to: req.session.userid,
        subject: 'Order Canceled',
        html: '<div><h1>Well-Come to Shinde-Shop</h1><p>Your Order Canceled</p><h3>Happy Shopping</h3><p>Visit our website <a href="https://xyzss.herokuapp.com/">xyzss.herokuapp.com</a></></div>'
    };

    transporter.sendMail(mailOptions);
    res.redirect('/orders');
});

app.get('/electronics', async(req, res) => {
    if (!req.session.isAuth) {
        return res.redirect("/login");
    }
    const tem = await Electronics.find({});
    const data = tem.filter((e) => {
        if (e.price) {
            return e;
        }
    });
    res.render('./clothes.ejs', { data: data });

})

app.listen(process.env.PORT || 3500);