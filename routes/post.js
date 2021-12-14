const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { Post, Hashtag, Image, User } = require('../models');
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

        res.status(200).send('OK');
    } catch (error) {
        console.error(error);
        next(error);
    }
});

router.get('/', isLoggedIn, async (req, res, next) => {
    try {
        if (req.query.page == 0) { // 전체 글
            const posts = await Post.findAll({
                include: [
                    {
                        model: Image,
                    }
                ]
            });
            res.status(200).send(posts);
        } else if (parseInt(req.query.page) > 0) {
            const offset = 9 * (req.query.page - 1);
            const searchWord = req.query.word;
            if (req.query.word.length > 0 && req.query.type.length > 1) { // 검색 (검색창 사용)
                if (req.query.type === 'writer') { // 작성자
                    const posts = await Post.findAll({
                        offset: offset,
                        limit: 9,
                        include: [
                            {
                                model: Image,
                            },
                            {
                                model: User,
                                where: { name: { [Op.like]: "%" + searchWord + "%" } }
                            }
                        ]
                    });
                    res.status(200).send(posts);
                }
                else if (req.query.type === 'post') { // 게시글
                    const posts = await Post.findAll({
                        where: {
                            content: { [Op.like]: "%" + searchWord + "%" }
                        },
                        offset: offset,
                        limit: 9,
                        include: [
                            {
                                model: Image,
                            },
                        ]
                    });

                    const result = [];
                    for (let i = 0; i < posts.length; i++) {
                        const hashtags = posts[i].content.match(/#[^\s#]*/g);
                        if (!hashtags || !(hashtags.includes('#' + searchWord))) result.push(posts[i]);
                    }
                    res.status(200).send(result);
                }
                else { // 해시태그
                    const tmpId = await Hashtag.findAll({
                        attributes: ['id'],
                        where: {
                            title: { [Op.like]: "%" + searchWord + "%" }
                        }
                    });

                    const hashtagId = [];
                    for (let i = 0; i < tmpId.length; i++) hashtagId.push(tmpId[i].dataValues.id);

                    const arr = await db.sequelize.models.PostHashtag.findAll({
                        attributes: ['PostId'],
                        where: {
                            HashtagId: { [Op.in]: hashtagId }
                        }
                    });
                    const postId = [];
                    for (let i = 0; i < arr.length; i++)
                        postId.push(arr[i].dataValues.PostId);

                    const posts = await Post.findAll({
                        where: {
                            id: { [Op.in]: postId }
                        },
                        offset: offset,
                        limit: 9,
                        include: [
                            {
                                model: Image,
                            }
                        ]
                    });
                    res.status(200).send(posts);
                }
            } else if (req.query.word.length > 0 && req.query.type.length === 1) { // 검색 (하이퍼링크)
                if (req.query.type === 'h') {
                    const hashtagId = await Hashtag.findOne({
                        attributes: ['id'],
                        where: {
                            title: searchWord
                        }
                    })

                    const arr = await db.sequelize.models.PostHashtag.findAll({
                        attributes: ['PostId'],
                        where: {
                            HashtagId: hashtagId.dataValues.id
                        }
                    });
                    const postId = [];
                    for (let i = 0; i < arr.length; i++) postId.push(arr[i].dataValues.PostId);

                    const posts = await Post.findAll({
                        where: {
                            id: { [Op.in]: postId }
                        },
                        offset: offset,
                        limit: 9,
                        include: [
                            {
                                model: Image,
                            }
                        ]
                    });
                    res.status(200).send(posts);
                } else if (req.query.type === 'n') {
                    const posts = await Post.findAll({
                        where: {
                            nick: searchWord
                        },
                        include: [
                            {
                                model: Image,
                            }
                        ]
                    })
                    res.status(200).send(posts);
                }
            } else { // 검색 X (한 페이지 기준)
                const posts = await Post.findAll({
                    offset: offset,
                    limit: 9,
                    include: [
                        {
                            model: Image,
                        }
                    ]
                });
                res.status(200).send(posts);
            }
        }
    } catch (error) {
        console.error(error);
    }
});

module.exports = router;