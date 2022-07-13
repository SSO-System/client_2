import axios from 'axios';
import { db } from '../db/connection';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';

export default () => ({
  homePage: async (req, res) => {
    if (req.session.role !== 'guest') {
      return res.redirect(`${process.env.APP_URL}/me`);
    }
    
    return res.render("home", {
      title: "Welcome to Client 2",
      authServerUrl: process.env.AUTH_ISSUER,
      appUrl: process.env.APP_URL,
      clientId: process.env.CLIENT_ID,
      codeChallenge: req.session.codeChallenge
    });
  },

  login_callback: async (req, res) => {
    if ("error" in req.query) {
      return res.render("callback_failed", {
        title: "Login Failed",
        appUrl: process.env.APP_URL,
        error: req.query.error,
        errorDescription: req.query.error_description
      });
    } else {
      if (req.query.code === undefined) {
        return res.render('callback_failed', {
          title: "Request Failed", 
          appUrl: process.env.APP_URL,
          error: "request_failed",
          errorDescription: "Missing authorization code"
        })
      }
      try {
        const result: any = await axios.post(`${process.env.AUTH_ISSUER}/token`, new URLSearchParams({
          client_id: `${process.env.CLIENT_ID}`,
          client_secret: `${process.env.CLIENT_SECRET}`,
          grant_type: "authorization_code",
          code: req.query.code,
          redirect_uri: process.env.APP_URL + "/login_callback",
          code_verifier: req.session.codeVerifier,
          scope: 'openid profile',
          code_challenge_method: 'S256',
        }));
        
        const userInfo: any = await axios.post(`${process.env.AUTH_ISSUER}/me`, new URLSearchParams({
          access_token: result.data.access_token
        }))

        await db.collection("app_2_session").doc(req.sessionID).update({
          accessToken: result.data.access_token,
          idToken: result.data.id_token,
          role: 'user',
          username: userInfo.data.username 
        })

        const user = await db.collection('app_2_account').where('username', '==', userInfo.data.username).get();
        
        if (user.empty) {
          userInfo.data.createdAt = (new Date()).toISOString();
          await db.collection('app_2_account').add(userInfo.data);
        }
        
        return res.redirect(req.session.redirect_to ? req.session.redirect_to : `${process.env.APP_URL}/me`);

      } catch (e: any) {
        console.log(e.message);
      }
    }
  },
  
  user_info: async (req, res) => {
    const username: string = req.session.username;
    const idToken: string = req.session.idToken;
    const accessToken: string = req.session.accessToken;
    const userInfo: any = await db.collection("app_2_account").where("username", "==", username).get();
    const user = userInfo.docs[0].data();

    return res.render("user_info", {
      idToken,
      appUrl: process.env.APP_URL,
      title: `Hello ${username}!`,
      clientId: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      authServerUrl: process.env.AUTH_ISSUER,
      username: username,
      firstname: user.firstname,
      lastname: user.lastname,
      birthdate: user.birthdate,
      gender: user.gender,
      picture: user.picture,
      createdAt: user.createdAt,
      email: user.email,
      emailVerified: user.email_verified
    });
  },

  logout_callback: async (req, res) => {
    const oneDay = 24 * 60 * 60 * 1000;
    const _app_2_session = req.sessionID;
    const new_session = uuidv4();
    res.cookie("_app_2_session", new_session, {
      httpOnly: true,
      maxAge: oneDay,
    });

    await db.collection('app_2_session').doc(_app_2_session).delete();
    await db.collection('app_2_session').doc(new_session).set({
      expiredAt: new Date(+ new Date() + oneDay),
      role: 'guest',
    });

    return res.redirect(`${process.env.APP_URL}`);
  },
  
  check_session: async (req, res) => {
    try {
      const access_token = req.session.accessToken;
      if (!access_token) {
        res.status(200).send({
          active: false,
        });
      } else {
        const result = await fetch(`${process.env.AUTH_ISSUER}/token/introspection`, {
              method: "POST",
              body: new URLSearchParams({
                client_id: `${process.env.CLIENT_ID}`,
                client_secret: `${process.env.CLIENT_SECRET}`,
                token: access_token
              })
            });
        const data = await result.json();
        res.status(200).send({
          active: data.active ? data.active : false,
        });
      };
    } catch (e: any) {
      console.log(e.message);
    }
  },
});
