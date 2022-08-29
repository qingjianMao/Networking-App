const express = require('express');
const router = express.Router();
const {check, validationResult} = require('express-validator')
const auth = require('../../middleware/auth');
const Post = require('../../models/Post');
const Profile = require('../../models/Profile');
const User = require('../../models/User')
const request = require('request')
const config = require('config')


//@route Post api/posts
//@desc Post Comment
//@access Public
router.post('/',  
    [
        auth,
        [check('text', 'Text is Required').not().isEmpty()]
    ], 

    async(req, res) => {
        const errors = validationResult(req);
        if(!errors.isEmpty()){
            return res.status(400).json({errors : errors.array()});
        }

        try{
            const user = await User.findById(req.user.id).select('-password');
            const newPost = new Post({
                text: req.body.text,
                name: user.name,
                avatar: user.avatar,
                user: req.user.id
            });
        
            const post = await newPost.save();
        
            res.json(post);

        } catch(err){
            console.error(err.message);
            res.status(500).send('Server Error');
        }

    }
)


//@route Get api/posts
//@desc Get all posts
//@access Private
router.get('/', async(req, res) => {
    try{
        const posts = await Post.find().sort({ date : -1});
        if(posts.length === 0) {
            return res.status(404).json({msg : 'No Post currently'})
        }
        res.json(posts);
        
    } catch(err){
        console.error(err.message);
        res.status(500).send('Server Error');
    }
})


//@route Get api/posts/:id
//@desc Get Post by id
//@access Private

router.get('/:id', async(req, res) => {
    try{
        const post = await Post.findById(req.params.id)
        if(!post) {
            return res.status(404).json({msg : 'Post Not Found'})
        }
        res.json(post);
        
    } catch(err){
        console.error(err.message);
        if(err.kind == 'ObjectId'){
            return res.status(404).json({msg : 'Post not Found'});
        }
        res.status(500).send('Server Error');
    }
})



//@route Delete api/posts/:id
//@desc Delete posts by Id
//@access Private
router.delete('/:id', auth, async(req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        
        // Check User
        if (post.user.toString() != req.user.id){
            return res.status(401).json({msg : 'User not authorized'});
        }

        await post.remove();
        res.json({msg : 'Post Removed'});
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
})

//@route Put api/posts/like/:id
//@desc Put Like a Post
//@access Private
router.put('/like/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        //Check if post has already been liked
        if(post.likes.filter(like => like.user.toString() === req.user.id).length > 0){
            return res.status(400).json({msg : "Post has been liked"})
        }

        post.likes.unshift({user : req.user.id});

        await post.save();

        res.json(post.likes);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: 'Server error' });
    }
});

//@route Put api/posts/unlike/:id
//@desc Put Like a Post
//@access Private
router.put('/unlike/:id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        //Check if post has already been liked
        if(post.likes.filter(like => like.user.toString() === req.user.id).length === 0){
            return res.status(400).json({msg : "Post has not yet been liked"})
        }

        //remove the like
        post.likes = post.likes.filter(
            ({user}) => user.toString() !== req.user.id
        );

        await post.save();

        res.json(post.likes);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: 'Server error' });
    }
  });


// @route    POST api/posts/comment/:id
// @desc     Comment on a post
// @access   Private
router.post('/comment/:id',
        [
            auth,
            [check('text', 'Text is Required').not().isEmpty()]
        ], 
    async (req, res) => {
        const errors = validationResult(req);
        if(!errors.isEmpty()){
            return res.status(400).json({errors : errors.array()})
        }

        try {
            const user = await User.findById(req.user.id);
            const post = await Post.findById(req.params.id);
            
            const newComment = {
                text : req.body.text,
                user : req.user.id,
                name : user.name,
                avator : user.avator
            }

            post.comments.unshift(newComment);

            await post.save();
            
            res.json(post.comments)

        } catch(err){
            console.error(err.message)
            res.status(500).send('Server Error')
        }

    }
)
  
  // @route    DELETE api/posts/comment/:id/:comment_id
  // @desc     Delete comment
  // @access   Private
router.delete('/comment/:id/:comment_id', auth, async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
  
        // Pull out comment
        const comment = post.comments.find(
            (comment) => comment.id === req.params.comment_id
        );
        // Make sure comment exists
        if (!comment) {
            return res.status(404).json({ msg: 'Comment does not exist' });
        }
        // Check user
        if (comment.user.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }
  
        post.comments = post.comments.filter(
            ({ id }) => id !== req.params.comment_id
        );
  
        await post.save();
  
        return res.json(post.comments);
    } catch (err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    }
  });



module.exports = router