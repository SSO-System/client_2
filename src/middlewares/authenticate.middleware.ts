import { db } from '../db/connection';
import { v4 as uuidv4 } from 'uuid';

const oneDay = 24 * 60 * 60 * 1000;
// If user authenticated -> allow
// Otherwise -> redirect to homepage 
export const authenticate = async (req, res, next) => {
    const _app_2_Session = req.cookies._app_2_Session;
    
    if (_app_2_Session === undefined) {
        return res.redirect(`${process.env.APP_URL}`);
    }
    else {
        const session: any = await db.collection('app_2_session').doc(_app_2_Session).get();
        if (session.exists) {
            const role: string = session.data().role;
            
            if (role === 'guest') {
                return res.redirect(`${process.env.APP_URL}`);
            }           
            
        } else {
            req.cookies.set("_app_2_Session", "", {
                httpOnly: true,
                maxAge: 0
            })
            return res.redirect(`${process.env.APP_URL}`);
        }
    }
    next();
}