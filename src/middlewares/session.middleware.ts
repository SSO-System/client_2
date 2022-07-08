import { db } from '../db/connection';
import { v4 as uuidv4 } from 'uuid';

const oneDay = 24 * 60 * 60 * 1000;
// If no session -> Init. Otherwise -> Next
export const check_session = async (req, res, next) => {
    const _app_2_Session = req.cookies?._app_2_Session;
    if (_app_2_Session === undefined) {
        const new_session = uuidv4();
        const expiredAt = new Date(+ new Date() + oneDay);
        await res.cookie("_app_2_Session", new_session, {
            httpOnly: true,
            maxAge: oneDay,
        })
        await db.collection('app_2_session').doc(new_session).set({
            expiredAt,
            role: 'guest',
        })
        res.locals._app_2_Session = new_session;
    } else {
        const session = await db.collection('app_2_session').doc(_app_2_Session).get();
        if (!session.exists) {
            const new_session = uuidv4();
            const expiredAt = new Date(+ new Date() + oneDay);

            await res.cookie("_app_2_Session", new_session, {
                httpOnly: true,
                maxAge: oneDay,
            })

            await db.collection('app_2_session').doc(new_session).set({
                expiredAt,
                role: 'guest',
            })
            
            res.locals._app_2_Session = new_session
        } else {
            const expiredAt = new Date(+ new Date() + oneDay);

            await res.cookie("_app_2_Session", _app_2_Session, {
                httpOnly: true,
                maxAge: oneDay,
            })

            await db.collection('app_2_session').doc(_app_2_Session).update({
                expiredAt
            })

            res.locals._app_2_Session = _app_2_Session;
        }
    }

    next();
}