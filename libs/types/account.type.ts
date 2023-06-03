export type AccountType = {
    containerName: string;
    expiredIn: number;
};

export type AzureAccountType = AccountType & {
    name: string;
    key: string;
};

export type S3AccountType = AzureAccountType & {
    region?: string;
};
