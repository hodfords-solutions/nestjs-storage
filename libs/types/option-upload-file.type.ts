import { MimeTypeEnum } from '../enums/mime-type.enum';
import { ImageFormatEnum } from '../enums/image-format.enum';

export type OptionUploadFileType = {
    imageFormat: ImageFormatEnum;
    mimeTypeConverts: MimeTypeEnum[];
};
