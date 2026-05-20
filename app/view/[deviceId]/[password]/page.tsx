import ViewerClient from '../../../../components/ViewerClient';

type PageProps = {
  params: {
    deviceId: string;
    password: string;
  };
};

export default function ViewerPage({ params }: PageProps) {
  return <ViewerClient  />;
}
