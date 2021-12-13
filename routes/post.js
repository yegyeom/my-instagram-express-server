const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { Post, Hashtag, Image } = require('../models');
const { isLoggedIn } = require('./middlewares');
const { Op } = require('sequelize');
const db = require('../models');

const router = express.Router();

const upload = multer({
    storage: multer.diskStorage({
        destination(req, file, cb) {
            cb(null, '/home/web12/public_html/uploads/');
        },
        filename(req, file, cb) {
            const ext = path.extname(file.originalname);
            cb(null, path.basename(file.originalname, ext) + Date.now() + ext);
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/img', isLoggedIn, upload.array('image', 5), (req, res) => {
    const { files } = req;
    files.forEach((file) => {
        fs.chmodSync(file.path, 0o755);
        file.path = file.path.substring(23, file.path.length);
    });
    res.send(files);
});

router.patch('/img', isLoggedIn, upload.array('image', 5), (req, res) => {
    const { files } = req;

    files.forEach((file) => {
        fs.chmodSync(file.path, 0o755);
        file.path = file.path.substring(23, file.path.length);
    });
    res.send(files);
});

router.post('/', isLoggedIn, async (req, res, next) => {
    try {
        const post = await Post.create({
            content: req.body.content,
            UserId: req.user.id,
            nick: req.user.userId
        });
        for (let i = 0; i < req.body.imagePaths.length; i++) {
            await Image.create({
                path: req.body.imagePaths[i],
                PostId: post.id
            });
        }

        const hashtags = req.body.content.match(/#[^\s#]*/g);
        if (hashtags) {
            const result = await Promise.all(
                hashtags.map(tag => {
                    return Hashtag.findOrCreate({
                        where: { title: tag.slice(1).toLowerCase() },
                    })
                }),
            );
            await post.addHashtags(result.map(r => r[0]));
        }
        console.log('업로드 성공!');
        res.status(200).send('OK');
    } catch (error) {
        console.error(error);
        next(error);
    }
});

router.patch('/post', isLoggedIn, async (req, res, next) => {
    try {
        const remainImageId = req.body.remainImageId;

        await Post.update({
            content: req.body.content
        }, {
            where: { id: req.body.postId }
        });

        const post = await Post.findOne({
            where: {
                id: req.body.postId
            }
        })

        await Image.destroy({
            where: {
                PostId: req.body.postId,
                id: { [Op.notIn]: remainImageId }
            }
        })

        for (let i = 0; i < req.body.newImagePaths.length; i++) {
            await Image.create({
                path: req.body.newImagePaths[i],
                PostId: req.body.postId
            });
        }

        const hashtags = req.body.content.match(/#[^\s#]*/g);
        if (hashtags) {
            const titles = hashtags.map((item) => {
                return item.slice(1).toLowerCase()
            })
            const id = (await Hashtag.findAll({
                attributes: ['id'],
                where: {
                    title: { [Op.in]: titles }
                }
            })).map(res => res.id);

            await db.sequelize.models.PostHashtag.destroy({
                where: {
                    PostId: req.body.postId,
                    HashtagId: { [Op.notIn]: id }
                }
            })
        }
        if (hashtags) {
            const result = await Promise.all(
                hashtags.map(tag => {
                    return Hashtag.findOrCreate({
                        where: { title: tag.slice(1).toLowerCase() },
                    })
                }),
            );
            await post.addHashtags(result.map(r => r[0]));
        }

        console.log('업로드 성공!');
        res.status(200).send('OK');
    } catch (error) {
        console.error(error);
        next(error);
    }
});

router.get('/posts', isLoggedIn, async (req, res, next) => {
    try {
        const posts = await Post.findAll({
            include: [
                {
                    model: Image,
                }
            ]
        });
        res.status(200).send(posts);
    } catch (error) {
        console.error(error);
        next(error);
    }
});

module.exports = router;