
const express = require('express');
const router = express.Router();
const User = require('./../models/User');
const UserVerification = require('./../models/UserVerification');

router.get('/verify/:token', (req, res) => {
    const token = req.params.token;

    UserVerification.findOne({ verificationToken: token })
        .then(userVerification => {
            if (!userVerification) {
                return res.status(404).json({
                    status: 'FAILED',
                    message: 'Invalid verification token.',
                });
            }

            const userId = userVerification.userId;

            User.findByIdAndUpdate(userId, { isVerified: true })
                .then(updatedUser => {
                    if (!updatedUser) {
                        return res.status(404).json({
                            status: 'FAILED',
                            message: 'User not found for verification token.',
                        });
                    }
                    res.redirect('/verification-success');
                })
                .catch(err => {
                    console.error('Error updating user isVerified property:', err);
                    res.status(500).json({
                        status: 'FAILED',
                        message: 'An error occurred while updating user isVerified property.',
                    });
                });
        })
        .catch(err => {
            console.error('Error finding user verification:', err);
            res.status(500).json({
                status: 'FAILED',
                message: 'An error occurred while finding user verification.',
            });
        });
});

module.exports = router;
