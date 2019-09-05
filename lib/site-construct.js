const cdk = require('@aws-cdk/core');
const { Construct } = require('@aws-cdk/core');
const { Bucket } = require('@aws-cdk/aws-s3');
const { Certificate } = require('@aws-cdk/aws-certificatemanager');
const { CloudFrontWebDistribution, PriceClass, SSLMethod, SecurityPolicyProtocol } = require('@aws-cdk/aws-cloudfront');
const { HostedZone, ARecord, AddressRecordTarget } = require('@aws-cdk/aws-route53');
const { CloudFrontTarget } = require('@aws-cdk/aws-route53-targets/lib');

/**
 * @typedef {Object}  StaticSiteOptions
 * @property {string}        domainName  - The domain name where this app will be installed.
 * @property {string}        [indexDoc]  - The index document, defaults to index.html
 * @property {string}        [errorDoc]  - The error document, defaults to error.html
 * @property {string}        certArn     - The ARN of the SSL Certificate to be used
 */

class StaticSite extends Construct {
    /**
     * @param {Construct} scope
     * @param {string} id
     * @param {StaticSiteOptions} options
     */
    constructor(scope, id, options) {
        super(scope, id);

        const {
            domainName,
            indexDoc = 'index.html',
            errorDoc = 'error.html',
            certArn
        } = options;

        // Static Website
        const site = new Bucket(this, domainName, {
            bucketName: domainName,
            websiteIndexDocument: indexDoc,
            websiteErrorDocument: errorDoc,
            publicReadAccess: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        new cdk.CfnOutput(this, 'Bucket URL', { value: site.bucketWebsiteUrl });

        // Static Website Certificate (Manually Provisioned)
        const certificate = Certificate.fromCertificateArn(this, 'Certificate', certArn);

        // CloudFront distribution that provides HTTPS
        const distribution = new CloudFrontWebDistribution(this, 'SiteDistribution', {
            aliasConfiguration: {
                acmCertRef: certificate.certificateArn,
                names: [ domainName ],
                sslMethod: SSLMethod.SNI,
                securityPolicy: SecurityPolicyProtocol.TLS_V1_2_2018,
            },
            priceClass: PriceClass.PRICE_CLASS_100,
            originConfigs: [
                {
                    s3OriginSource: {
                        s3BucketSource: site
                    },
                    behaviors : [ {isDefaultBehavior: true}],
                }
            ],
            errorConfigurations: [{
                errorCode: 403,
                errorCachingMinTtl: 86400,
                responseCode: 200,
                responsePagePath: '/index.html'

            }]
        });
        new cdk.CfnOutput(this, 'DistributionId', { value: distribution.distributionId });

        const zone = HostedZone.fromLookup(this, "zone", {
            domainName: domainName
        });

        new ARecord(this, 'SiteAliasRecord', {
            recordName: domainName,
            target: AddressRecordTarget.fromAlias(new CloudFrontTarget(distribution)),
            zone
        });

        new cdk.CfnOutput(this, 'StaticSiteURL', { value: "https://" + domainName, description: "The URL of the Static Site" })
    }
}

module.exports = { StaticSite };