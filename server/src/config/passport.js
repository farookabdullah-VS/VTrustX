const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const PostgresRepository = require('../infrastructure/database/PostgresRepository');
require('dotenv').config();

const userRepo = new PostgresRepository('users');
const tenantRepo = new PostgresRepository('tenants');

if (process.env.GOOGLE_CLIENT_ID) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/auth/google/callback",
        proxy: true
    },
        async function (accessToken, refreshToken, profile, cb) {
            try {
                if (!profile.emails || profile.emails.length === 0) {
                    return cb(new Error("No email found in Google profile"));
                }
                const email = profile.emails[0].value;
                const user = await userRepo.findBy('email', email);

                if (user) {
                    return cb(null, user);
                } else {
                    // Create New User
                    // 1. Create Tenant
                    const tenantName = `${profile.displayName}'s Organization`;
                    const newTenant = await tenantRepo.create({
                        name: tenantName,
                        plan: 'free',
                        subscription_status: 'active',
                        created_at: new Date()
                    });

                    // 2. Create User
                    const crypto = require('crypto');
                    const newUser = {
                        username: email.split('@')[0], // derived username
                        email: email,
                        password: 'oauth-' + crypto.randomBytes(32).toString('hex'),
                        role: 'user',
                        tenant_id: newTenant.id,
                        created_at: new Date()
                    };
                    const createdUser = await userRepo.create(newUser);
                    return cb(null, createdUser);
                }
            } catch (err) {
                return cb(err);
            }
        }
    ));
} else {
    console.warn("Skipping Google OAuth strategy - GOOGLE_CLIENT_ID not set");
}

const MicrosoftStrategy = require('passport-microsoft').Strategy;

if (process.env.MICROSOFT_CLIENT_ID) {
passport.use(new MicrosoftStrategy({
    clientID: process.env.MICROSOFT_CLIENT_ID,
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
    callbackURL: "/api/auth/microsoft/callback",
    scope: ['user.read']
},
    async function (accessToken, refreshToken, profile, done) {
        try {
            // Microsoft profile structure might differ slightly
            // profile.emails might be profile.emails or profile._json.mail or profile._json.userPrincipalName
            const email = (profile.emails && profile.emails.length > 0) ? profile.emails[0].value : (profile._json ? (profile._json.mail || profile._json.userPrincipalName) : null);

            if (!email) {
                return done(new Error("No email found in Microsoft profile"));
            }

            const user = await userRepo.findBy('email', email);
            if (user) {
                return done(null, user);
            } else {
                // Create Tenant & User
                const tenantName = `${profile.displayName || email}'s Organization`;
                const newTenant = await tenantRepo.create({
                    name: tenantName,
                    plan: 'free',
                    subscription_status: 'active',
                    created_at: new Date()
                });

                const crypto = require('crypto');
                const newUser = {
                    username: email.split('@')[0],
                    email: email,
                    password: 'oauth-ms-' + crypto.randomBytes(32).toString('hex'),
                    role: 'user',
                    tenant_id: newTenant.id,
                    created_at: new Date()
                };
                const createdUser = await userRepo.create(newUser);
                return done(null, createdUser);
            }
        } catch (err) {
            console.error("[Passport MS Error]", err.message);
            return done(err);
        }
    }
));
} else {
    console.warn("Skipping Microsoft OAuth strategy - MICROSOFT_CLIENT_ID not set");
}

// Serialization is not strictly needed if we don't use sessions, but passport might require it.
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await userRepo.findById(id);
        done(null, user);
    } catch (e) {
        done(e);
    }
});

module.exports = passport;
