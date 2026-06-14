import React, { useMemo } from 'react';
import type { Invitation } from '../../types/Invitation.ts';
import { DataTable } from '../common/table/DataTable.tsx';
import { useDateFormat } from '../../utils/useDateFormat';

type SentInvitationsListProps = {
  invitations: Invitation[];
  processingInvitation: boolean;
  onDeleteInvitation: (invitation: Invitation) => void;
};

export const SentInvitationsList: React.FC<SentInvitationsListProps> = ({
  invitations,
  processingInvitation,
  onDeleteInvitation,
}) => {
  const { format_date } = useDateFormat();

  const data = useMemo(
    () =>
      invitations.map((invitation) => ({
        id: invitation.id,
        Receiver: invitation.receiverName,
        'Date Sent': format_date(invitation.created),
        invitation,
      })),
    [invitations]
  );

  return (
    <DataTable
      title={'Sent Invitations'}
      headers={['Receiver', 'Date Sent']}
      data={data}
      permissions={['Delete']}
      disableDelete={processingInvitation}
      pageSize={10}
      onDelete={(row) => onDeleteInvitation(row.invitation)}
    />
  );
};
