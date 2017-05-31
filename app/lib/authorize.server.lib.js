/*
 * This authorizes requests.
 * Admin role can do anything.
 * Manager role can to anything for 'owned' clients (reseller).
 * User role can only view & use data in most cases.
 * Take into account the device ACL for devices.
 */

var _ = require('lodash');

exports.validate = function (endpoint, req, res, role, callback) {

    switch (endpoint) {
        case 'client':
            validateClientEndpoint(req, res, role, callback);
            break;
        case 'user':
            validateUserEndpoint(req, res, role, callback);
            break;
        case 'asset':
            validateAssetEndpoint(req, res, role, callback);
            break;
    }

};

function validateClientEndpoint(req, res, role, callback) {

    /*
    Is the client ID you're trying to access either your ID or is one of your clients as a reseller? If it is, you're good to go.
    Is this that simple? I guess this is the first step. What about role?
        - If the role is admin, you can do anything
        - If it's manager, you can so some things
        - It it's user, you can do few things
    This is where I can use the role param, see if the user's role matches the required role. Then am I good?
     */

    // Check if the user is super, they can do anything
    if (req.user.role === 'super') {
        callback();
        return;
    }

    // Sandbox into the user's client and/or resellers
    if (req.user.client === req.params.id || _.contains(req.user.resellerClients, req.params.id)){
        if (req.user.role === 'admin') {
            callback();
            return;
        }

        switch (role) {
            case 'manager':
                if (req.user.role === 'manager') {
                    callback();
                    return;
                }
                break;
            case 'user':
                if (req.user.role === 'manager' || req.user.role === 'user'){
                    callback();
                    return;
                }
                break;
        }
    }

    notAuthorized(res);
}

function validateUserEndpoint(req, res, role, callback) {
    callback();
}

function validateAssetEndpoint(req, res, role, callback) {
    callback();
}

function notAuthorized(res) {
    res.status(401).send({
        message: 'You are not authorized to access this resource.'
    });
}