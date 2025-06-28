const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/mini-project');

const userSchema = mongoose.Schema({
     name: String,
     email: String,
     password: String,
     profilePicture: {
      type: String,
      default: 'default.png'
     },
     post: [{
           type: mongoose.Schema.Types.ObjectId,
           ref: 'post'
     }]
});

module.exports = mongoose.model('user', userSchema);

