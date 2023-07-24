import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'app-activitylog-card',
  templateUrl: './activitylog-card.component.html',
  styleUrls: ['./activitylog-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivitylogCardComponent implements OnInit {
  @Input() activity!: any;
  notificationType!: any;
  constructor() {}

  getIcon(type: string) {
    switch (type) {
      case 'Member Added':
        return '../../assets/images/icons/add-member.svg';
      case 'Member Removed':
        return '../../assets/images/icons/remove-member.svg';
      case 'File Uploaded':
        return '../../assets/images/icons/file-upload.svg';
      case 'File Deleted':
        return '../../assets/images/icons/file-delete.svg';
      case 'Project Created':
        return '../../assets/images/icons/create-project.svg';
      default:
        return '';
    }
  }

  formattedTime(createTime: string) {
    const date = new Date(createTime);
    // const offset = new Date(createTime).getTimezoneOffset();
    // const getHours = date.getHours();
    // const setHours = getHours + (-1 * offset) / 60;
    // const offsetDate = new Date(date.setHours(setHours));
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    });
    return formattedTime;
  }

  formattedDate(createTime: string) {
    const date = new Date(createTime);
    const day = date.getDate();
    const month = date.toLocaleString('default', {month: 'long'});
    return `${day}${this.getDaySuffix(day)} ${month}`;
  }

  getDaySuffix(day: any) {
    switch (day) {
      case 1:
      case 21:
      case 31:
        return 'st';
      case 2:
      case 22:
        return 'nd';
      case 3:
      case 23:
        return 'rd';
      default:
        return 'th';
    }
  }

  getHeader(item: any) {
    if (item.type === 'File Uploaded') {
      const numFiles = item.title.split('||').length;
      return numFiles > 1 ? `${numFiles} Files Uploaded` : item.title;
    }
    return item.title;
  }

  getType(item: any) {
    return `${item.type} by ${item.ownerEmail}`;
  }

  ngOnInit(): void {}
}
