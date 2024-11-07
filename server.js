
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Post = require('./models/Post');

dotenv.config();
const app = express();
app.use(express.json());

// Connect to MongoDB
mongoose.connect(`mongodb://127.0.0.1:27017/ramadb`, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("MongoDB connected"))
.catch((error) => console.error("MongoDB connection error:", error));

// Middleware for JWT authentication
const auth = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).send("Access denied. No token provided.");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (ex) {
    res.status(400).send("Invalid token.");
  }
};

// User Registration
app.post('/auth/register', async (req, res) => {
  const { name, email, username, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).send("User already exists.");

    const user = new User({ name, email, username, password });
    await user.save();
    res.send("User registered successfully");
  } catch (error) {
    res.status(500).send("Server error");
  }
});

// User Login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).send("Invalid email or password");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).send("Invalid email or password");

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    res.status(500).send("Server error");
  }


});

// Create a Post
app.post('/posts', auth, async (req, res) => {
  const { content, media } = req.body;
  try {
    const post = new Post({
      content,
      media,
      author: req.user._id
    });
    await post.save();
    res.json(post);
  } catch (error) {
    res.status(500).send("Server error");
  }
});


// Like a Post
app.post('/posts/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).send("Post not found");

    if (!post.likedBy.includes(req.user._id)) {
      post.likes++;
      post.likedBy.push(req.user._id);
      await post.save();
    }
    res.json(post);
  } catch (error) {
    res.status(500).send("Server error");
  }
});

// Comment on a Post
app.post('/posts/:id/comment', auth, async (req, res) => {
  const { text } = req.body;
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).send("Post not found");

    const comment = {
      text,
      author: req.user._id
    };
    post.comments.push(comment);
    await post.save();
    res.json(post);
  } catch (error) {
    res.status(500).send("Server error");
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
