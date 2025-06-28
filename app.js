const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userModel = require('./models/user');
const postModel = require('./models/post'); // Assuming you have a post model
const nulterconfig = require('./config/multerconfig');
const path = require('path');
const upload = require('./config/multerconfig');
const app = express();

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded( { extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());


app.get('/', (req, res) => {
    res.render('index');
});

app.post('/create', async (req, res) => {
    const {name, email, password} = req.body;
    let user = await userModel.findOne({email : email});
    if (user != null) {
        return res.status(400).send('User already exists');
    }
  
    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(password, salt, async function(err, hash) {
            
            let createUser = await userModel.create({
                name, 
                email, 
                password: hash
            })

            let token = jwt.sign({email: email, userid: createUser._id}, "secretkey");
            res.cookie('token', token);
            res.redirect('/profile');
        })
    })
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', async (req, res) => {
    const {email, password} = req.body;
    let user = await userModel.findOne({ email: email });
    if (user == null) {
        return res.status(400).send('something went wrong');
    }
    bcrypt.compare(password, user.password, function(err, result) {
        if(result) {
            let token = jwt.sign({email: email, userid: user._id}, "secretkey");
            res.cookie('token', token);
            res.redirect('/profile');
        } else {
            res.status(400).send('something went wrong');
        }
    })
});

app.get('/logout', (req, res) => {
    res.cookie('token', '');
    res.redirect('/login');
});

app.get('/profile', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ _id: req.user.userid }).populate('post');
    res.render('profile', { user: user });
});

app.post('/posts', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({_id: req.user.userid });
    let {postContent} = req.body;

    let post = await postModel.create({
        user: user._id,
        content: postContent
    });
    user.post.push(post._id);
    await user.save();
    res.redirect('/profile');
})

function isLoggedIn(req, res, next) {
    if(req.cookies.token == "") {
        return res.send('You are not logged in');
    } else {
        let data = jwt.verify(req.cookies.token, "secretkey");
        req.user = data;
        next();
    }
}

app.get('/delete/:id', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({_id: req.user.userid });
    user.post.pull(req.params.id);
    await user.save();
    await postModel.deleteOne({_id: req.params.id});
    res.redirect('/profile');
});

app.get('/like/:id', isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({_id: req.params.id}).populate('user');
    if(post.likes.indexOf(req.user.userid) === -1) {
        post.likes.push(req.user.userid);
    } else {
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }
    await post.save();
    res.redirect('/profile');
});

app.get('/edit/:id', isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({_id: req.params.id});
    let user = await userModel.findOne({_id: req.user.userid });
    res.render('edit', {post: post, user: user});

});

app.post('/update/:id', isLoggedIn, async (req, res) => {
    let {postContent} = req.body;
    let post = await postModel.findOneAndUpdate({_id: req.params.id}, {content: postContent});
    res.redirect('/profile');
});

app.get('/userImage', isLoggedIn, (req, res) => {
    res.render('userImage');
})

app.post('/upload', isLoggedIn, upload.single('image'), async (req, res) => {
    let user = await userModel.findOne({email:  req.user.email});
    user.profilePicture = req.file.filename;
    await user.save();
    res.redirect('/profile');
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});