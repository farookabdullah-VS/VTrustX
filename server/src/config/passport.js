const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const PostgresRepository = require('../infrastructure/database/PostgresRepository');
require('dotenv').config();

const userRepo = new PostgresRepository('users');
const tenantRepo = new PostgresRepository('tenants');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
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
                const newUser = {
                    username: email.split('@')[0], // derived username
                    email: email,
                    password: 'oauth-generated-' + Math.random().toString(36), // Dummy password
                    role: 'admin',
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

const MicrosoftStrategy = require('passport-microsoft').Strategy;

passport.use(new MicrosoftStrategy({
    clientID: process.env.MICROSOFT_CLIENT_ID || "placeholder_id",
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "placeholder_secret",
    callbackURL: "/api/auth/microsoft/callback",
    scope: ['user.read']
},
    async function (accessToken, refreshToken, profile, done) {
        try {
            console.log("--- MICROSOFT AUTH DEBUG ---");
            console.log("Profile ID:", profile.id);
            if (profile.emails) console.log("Emails:", profile.emails);
            if (profile._json) console.log("UPN:", profile._json.userPrincipalName);
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

                const newUser = {
                    username: email.split('@')[0],
                    email: email,
                    password: 'oauth-ms-generated-' + Math.random().toString(36),
                    role: 'admin',
                    tenant_id: newTenant.id,
                    created_at: new Date()
                };
                const createdUser = await userRepo.create(newUser);
                return done(null, createdUser);
            }
        } catch (err) {
            console.error("--- PASSPORT ERROR CAUGHT ---", err);
            return done(err);
        }
    }
));

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
