const express = require('express');
const { check, validationResult } = require('express-validator');
const router = express.Router();
const auth = require('../../middleware/auth');
const Profile = require('../../models/Profile')
const User = require('../../models/User')
const request = require('request')
const config = require('config')
const axios = require('axios');


//@route Get api/profile/me
//@desc Get current users profile
//@access Private
router.get('/me', auth, async (req, res) => {
    try{
        const profile = await Profile.findOne({user : req.user.id}).populate('user',
        ['name', 'avatar']);

        if(!profile) {
            return res.status(400).json({msg : 'There is no Profile for this user'});
        }
        
        res.json(profile);
    } catch(err){
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});



//@route Post api/profile/me
//@desc Post current users profile
//@access Private
router.post('/', [
    auth,
        [
            check('status', 'Status is required').notEmpty(),
            check('skills', 'Skills is required').notEmpty()
        ]
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if(!errors.isEmpty()){
            return res.status(400).json({errors : errors.array()});
        }

        const {
            company,
            website,
            location,
            bio,
            status,
            githubusername,
            skills,
            youtube,
            facebook,
            twitter,
            instagram,
            linkedin
        } = req.body;

        //Build profile object
        const profileFields = {};
        profileFields.user = req.user.id;
        if(company) profileFields.company = company;
        if(website) profileFields.website = website;
        if(location) profileFields.location = location;
        if(bio) profileFields.bio = bio;
        if(status) profileFields.status = status;
        if(githubusername) profileFields.githubusername = githubusername;
        if(skills){
            profileFields.skills = skills.split(',').map(skill => skill.trim());
        }

        //Build social object
        profileFields.social = {}
        if(youtube) profileFields.social.youtube = youtube;
        if(facebook) profileFields.social.facebook = facebook;
        if(twitter) profileFields.social.twitter = twitter;
        if(linkedin) profileFields.social.linkedin = linkedin;
        if(instagram) profileFields.social.instagram = instagram;


        try{
            let profile = await Profile.findOne({user: req.user.id});

            if(profile){
                profile = await Profile.findOneAndUpdate(
                    {user : req.user.id},
                    {$set: profileFields},
                    {new : true}
                );

                return res.json(profile);
            }

            profile = new Profile(profileFields);
            await profile.save();
            res.json(profile);

        } catch(err){
            console.error(err.message);
            res.status(500).send('Server Error');
        }
      
    }
)


//@route Get api/profile/user/:user_id
//@desc Get profile by UserId
//@access Public
router.get('/user/:user_id', async(req, res) => {
    try{
        const profile = await Profile.findOne({user : req.params.user_id}).populate('user', ['name', 'avator']);
        if(!profile){
            return res.status(400).json({msg : 'Profile not Found'});
        }

        res.json(profile);
    } catch(err){
        console.error(err.message);
        if(err.kind == 'ObjectId'){
            return res.status(400).json({msg : 'Profile not Found'});
        }
        res.status(500).send('Server Error');
    }
})


//@route Delete api/profile/user/:user_id
//@desc Delete profile, user & post
//@access Private
router.delete('/', auth, async(req, res) => {
    try {
        // Remove profile
        // Remove user
        await Promise.all([
          Profile.findOneAndRemove({ user: req.user.id }),
          User.findOneAndRemove({ _id: req.user.id })
        ]);
    
        res.json({ msg: 'User deleted' });
      } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
      }
})



//@route Put api/profile/experience
//@desc Add profile experience
//@access Private
router.put('/experience', 
    [auth,
        [
            check('title', 'Title is Required').not().isEmpty(),
            check('company', 'Company is Required').not().isEmpty(),
            check('from', 'From is Required').not().isEmpty(),
        ]
    ], 
async(req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors : errors.array()});
    }

    try {
        const profile = await Profile.findOne({user : req.user.id});
 
        profile.experience.unshift(req.body);

        await profile.save();
        res.json(profile);

    } catch(err){
        console.error(err.message);
        res.status(500).send('Server Error');
    }

})


//@route Delete api/profile/experience/:exp_id
//@desc Delete experience
//@access Private
router.delete('/experience/:exp_id', auth, async (req, res) => {
    try {
      const foundProfile = await Profile.findOne({ user: req.user.id });
  
      foundProfile.experience = foundProfile.experience.filter(
        (exp) => exp._id.toString() !== req.params.exp_id
      );
  
      await foundProfile.save();
      return res.status(200).json(foundProfile);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: 'Server error' });
    }
  });


//@route Put api/profile/education
//@desc Add profile education
//@access Private
router.put('/education', 
    [auth,
        [
            check('fieldofstudy', 'Field of Study is Required').not().isEmpty(),
            check('degree', 'Degree is Required').not().isEmpty(),
            check('school', 'School is Required').not().isEmpty(),
            check('from', 'From is Required').not().isEmpty(),
        ]
    ], 
async(req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors : errors.array()});
    }

    try {
        const profile = await Profile.findOne({user : req.user.id});
 
        profile.education.unshift(req.body);

        await profile.save();
        res.json(profile);

    } catch(err){
        console.error(err.message);
        res.status(500).send('Server Error');
    }

})


//@route Delete api/profile/education/:edu_id
//@desc Delete education
//@access Private
router.delete('/education/:edu_id', auth, async (req, res) => {
    try {
      const foundProfile = await Profile.findOne({ user: req.user.id });
  
      foundProfile.education = foundProfile.education.filter(
        (edu) => edu._id.toString() !== req.params.edu_id
      );
  
      await foundProfile.save();
      return res.status(200).json(foundProfile);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ msg: 'Server Error' });
    }
});


// @route    GET api/profile/github/:username
// @desc     Get user repos from Github
// @access   Public

router.get('/github/:username', async (req, res) => {
    try {
        const options = {
            uri : `https://api.github.com/users/${req.params.username}/
            repos?per_page=5&sort=created:asc&client_id=${config.get('githubClientId')}&cliend_secret=${config.get('githubSecret')}`,
            method : 'GET',
            headers : {'user-agent': 'node.js'}
        }

        request(options, (error, response, body) =>{
            if(error) console.error(error);
            if(response.statusCode != 200){
                res.status(404).json({msg : 'No Github Profile Found'});
            }

            res.json(JSON.parse(body));
        })
    } catch (err) {
      console.error(err.message);
      return res.status(500).json({msg : 'Server Error'});
    }
  });


module.exports = router