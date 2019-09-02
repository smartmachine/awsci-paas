#!/usr/bin/env node
const cdk = require('@aws-cdk/core');
const { AwsciStack } = require('../lib/awsci-stack');
const { CustomResourceStack } = require('../lib/custom-resource');

const app = new cdk.App();

new CustomResourceStack(app, 'CustomResourceStack', {
    env: {
        account: "865054731072",
        region: "eu-west-1"
    }
});

new AwsciStack(app, 'AwsciStack', {
    env: {
        account: "865054731072",
        region: "eu-west-1"
    }
});
