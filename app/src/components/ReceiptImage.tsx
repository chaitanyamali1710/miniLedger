import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, type ImageStyle, Platform, type StyleProp, Text } from 'react-native';
import { api } from '../api';

type Props = { token: string; loanId: number; style: StyleProp<ImageStyle> };

// Phones can send the login token as an image header. Browsers cannot,
// so on the web we download the photo first and show it from memory.
export function ReceiptImage({ token, loanId, style }: Props) {
  const source = api.receiptSource(token, loanId);
  const [webUri, setWebUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let url: string | null = null;
    fetch(source.uri, { headers: source.headers })
      .then((r) => (r.ok ? r.blob() : Promise.reject()))
      .then((blob) => {
        url = URL.createObjectURL(blob);
        setWebUri(url);
      })
      .catch(() => setFailed(true));
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [source.uri, source.headers.Authorization]);

  if (failed) return <Text style={{ color: '#fff' }}>Could not load the receipt</Text>;
  if (Platform.OS !== 'web') return <Image source={source} style={style} resizeMode="contain" />;
  if (!webUri) return <ActivityIndicator color="#fff" />;
  return <Image source={{ uri: webUri }} style={style} resizeMode="contain" />;
}
