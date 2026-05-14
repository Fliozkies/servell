import { Image, type ImageProps } from "expo-image";

type CachedImageProps = Omit<ImageProps, "source"> & {
  uri?: string | null;
  source?: ImageProps["source"];
};

export function CachedImage({
  uri,
  source,
  contentFit = "cover",
  cachePolicy = "memory-disk",
  transition = 120,
  ...props
}: CachedImageProps) {
  const resolvedSource = source ?? (uri ? { uri } : undefined);
  if (!resolvedSource) return null;

  return (
    <Image
      {...props}
      source={resolvedSource}
      contentFit={contentFit}
      cachePolicy={cachePolicy}
      transition={transition}
    />
  );
}
