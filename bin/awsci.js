#!/usr/bin/env node
const cdk = require('@aws-cdk/core');
const { AwsciStack } = require('../lib/awsci-stack');

const app = new cdk.App();
new AwsciStack(app, 'AwsciStack');
