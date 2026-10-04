import axios, { type AxiosRequestConfig } from "axios";
import { beginPageLoading, endPageLoading } from "./pageLoading";

export type PagePreloaderRequestConfig = AxiosRequestConfig & {
  skipPagePreloader?: boolean;
  pagePreloaderTracked?: boolean;
};

const API = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

API.interceptors.request.use((config) => {
  const pagePreloaderConfig = config as PagePreloaderRequestConfig;

  if (!pagePreloaderConfig.skipPagePreloader) {
    pagePreloaderConfig.pagePreloaderTracked = true;
    beginPageLoading();
  }

  return config;
});

API.interceptors.response.use(
  (response) => {
    const pagePreloaderConfig = response.config as PagePreloaderRequestConfig;

    if (pagePreloaderConfig.pagePreloaderTracked) {
      endPageLoading();
    }

    return response;
  },
  (error) => {
    const pagePreloaderConfig = error.config as
      | PagePreloaderRequestConfig
      | undefined;

    if (pagePreloaderConfig?.pagePreloaderTracked) {
      endPageLoading();
    }

    return Promise.reject(error);
  }
);

export default API;
