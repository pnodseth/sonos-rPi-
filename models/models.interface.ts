import { Document } from "mongoose";

export interface IUser extends Document {
  username: string;
  password: string;
  userSecret: string;
  accessToken: string;
  accessTokenExpirationTimestamp: string;
  refreshToken: string;
  devices: IDevice[];
  rfidChips: IRfidChip[];
  rfidIsRegistering: boolean;
}

export interface IDevice extends Document {
  userSecret: string;
  user: IUser;
  deviceName: string;
  sonosGroupId: string;
}

export interface IRfidChip extends Document {
  userSecret: string;
  user: IUser;
  id: string;
  sonosPlaylistId: string;
}
