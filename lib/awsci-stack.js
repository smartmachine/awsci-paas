const cdk = require('@aws-cdk/core');
const { Stack } = require('@aws-cdk/core');

const { StaticSite } = require('./site-construct');
const { LambdaApi } = require('./api-construct');
const { CognitoPool } = require('./cognito-construct');

class AwsciStack extends Stack {
    /**
     * @param {cdk.App} scope
     * @param {string} id
     * @param {Object=} props
     */
    constructor(scope, id, props) {
        super(scope, id, props);

        new StaticSite(this, 'awsci.io', {
            domainName: 'awsci.io',
            certArn:    'arn:aws:acm:us-east-1:865054731072:certificate/1c19f070-0b8f-4001-9561-6cb32b740170',
        });

        new LambdaApi(this, 'lambda-api', {
            wildcardCertArn: 'arn:aws:acm:us-east-1:865054731072:certificate/aa30e21f-cb3d-4eb1-bc53-f8710e9a3072',
            baseDomain:      'awsci.io',
            apiDomain:       'api.awsci.io'
        });

        new CognitoPool(this, 'cognito-pool');
    }
}

module.exports = { AwsciStack };
