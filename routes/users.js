const express = require('express');

const { isLoggedIn } = require('./middlewares');
const User = require('../models/user');

const router = express.Router();

router.post('/:id/follow', isLoggedIn, async (req, res, next) => {
    try {
        const user = await User.findOne({ where: { id: req.user.id } });
        if (user) {
            const id = await User.findAll({
                attributes: ['id'],
                where: {
                    userId: req.params.id
                }
            })

            await user.addFollowing(parseInt(id[0].dataValues.id, 10));
            res.send('success');
        } else {
            res.status(404).send('no user');
        }
    } catch (error) {
        console.error(error);
        next(error);
    }
});

router.post('/:id/unfollow', isLoggedIn, async (req, res, next) => {
    try {
        const user = await User.findOne({ where: { id: req.user.id } });
        if (user) {
            const id = await User.findAll({
                attributes: ['id'],
                where: {
                    userId: req.params.id
                }
            })

            await user.removeFollowing(parseInt(id[0].dataValues.id, 10));
            res.send('success');
        } else {
            res.status(404).send('no user');
        }
    } catch (error) {
        console.error(error);
        next(error);
    }
});

router.get('/', async (req, res, next) => {
    console.log(req.session)
    return res.send();

});

module.exports = router;