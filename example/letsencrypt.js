/*!
 * letiny-core
 * Copyright(c) 2015 AJ ONeal <aj@daplie.com> https://daplie.com
 * Apache-2.0 OR MIT (and hence also MPL 2.0)
*/
'use strict';

//var LeCore = require('letiny-core');
var LeCore = require('../').ACME.create();

var email = process.argv[2] || 'user@example.com';    // CHANGE TO YOUR EMAIL
var domains = [process.argv[3] || 'example.com'];     // CHANGE TO YOUR DOMAIN
var acmeDiscoveryUrl = LeCore.stagingServerUrl;

var challengeStore = require('./challenge-store');
var certStore = require('./cert-store');
var serve = require('./serve');
var closer;

var accountKeypair = null;
var domainKeypair = null;
var acmeUrls = null;


console.log('Using server', acmeDiscoveryUrl);
console.log('Creating account for', email, 'and registering certificates for', domains, 'to that account');
init();


function init() {
    getPrivateKeys(function () {

        console.log('Getting Acme Urls');
        LeCore.getAcmeUrls(acmeDiscoveryUrl, function (err, urls) {
        // in production choose LeCore.productionServerUrl

            console.log('Got Acme Urls', err, urls);
            acmeUrls = urls;
            runDemo();

        });
    });
}

function getPrivateKeys(cb) {
    console.log('Generating Account Keypair');
    const RSA = require('rsa-compat').RSA;
    RSA.generateKeypair(2048, 65537, {}, function (err, pems) {

        accountKeypair = pems;
        console.log('Generating Domain Keypair');
        RSA.generateKeypair(2048, 65537, {}, function (err, pems2) {

            domainKeypair = pems2;
            cb();
        });
    });
}

function runDemo() {
    console.log('Registering New Account');
    LeCore.registerNewAccount(
        { newRegUrl: acmeUrls.newReg
        , email: email
        , accountKeypair: accountKeypair
        , agreeToTerms: function (tosUrl, done) {

              // agree to the exact version of these terms
              console.log('[tosUrl]:', tosUrl);
              done(null, tosUrl);
          }
        }
      , function (err, regr) {

            // Note: you should save the registration
            // record to disk (or db)
            console.log('[regr]');
            console.log(err || regr);

            console.log('Registering New Certificate');
            LeCore.getCertificate(
                { newAuthzUrl: acmeUrls.newAuthz
                , newCertUrl: acmeUrls.newCert

                , domainKeypair: domainKeypair
                , accountKeypair: accountKeypair
                , domains: domains

                , setChallenge: challengeStore.set
                , removeChallenge: challengeStore.remove
                }
              , function (err, certs) {

                  // Note: you should save certs to disk (or db)
                  certStore.set(domains[0], certs, function () {

                    console.log('[certs]');
                    console.log(err || certs);
                    closer();

                  });

                }
            );
        }
    );
}

//
// Setup the Server
//
closer = serve.init({
  LeCore: LeCore
  // needs a default key and cert chain, anything will do
, tlsOptions: require('localhost.daplie.me-certificates')
, challengeStore: challengeStore
, certStore: certStore
});
