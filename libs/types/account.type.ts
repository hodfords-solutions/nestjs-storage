export type AccountType = {
    containerName: string;
    expiredIn: number;
    region: string;
};

export type AzureAccountType = AccountType & {
    name: string;
    key: string;
};

export type S3AccountType = Partial<AzureAccountType>;
