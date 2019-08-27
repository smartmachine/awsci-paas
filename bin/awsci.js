#!/usr/bin/env node
const cdk = require('@aws-cdk/core');
const { AwsciStack } = require('../lib/awsci-stack');

const app = new cdk.App();
new AwsciStack(app, 'AwsciStack', {
    env: {
        account: "865054731072",
        region: "eu-west-1"
    }
});
