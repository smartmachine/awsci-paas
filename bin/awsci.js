#!/usr/bin/env node
const cdk = require('@aws-cdk/core');
const { AwsciStack } = require('../lib/awsci-stack');

const app = new cdk.App();

const props = {
    stackProps: {
        env: {
            account: "865054731072",
            region: "eu-west-1"
        }
    },
    baseDomain:      'awsci.io',
    apiDomain:       'api.awsci.io',
    authDomain:      'auth.awsci.io',
    baseCertArn:     'arn:aws:acm:us-east-1:865054731072:certificate/1c19f070-0b8f-4001-9561-6cb32b740170',
    wildcardCertArn: 'arn:aws:acm:us-east-1:865054731072:certificate/aa30e21f-cb3d-4eb1-bc53-f8710e9a3072',
    callbackUrl:     'http://localhost:3000/login',
    logoutUrl:       'http://localhost:3000/logout'
};

new AwsciStack(app, 'AwsciStack', props);
